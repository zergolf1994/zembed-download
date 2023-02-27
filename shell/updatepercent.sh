for i in {1..86400}
do
    localhost="127.0.0.1"
    data=$(curl -sLf "http://${localhost}/update/task/percent" | jq -r ".")
    status=$(echo $data | jq -r ".status")
    msg=$(echo $data | jq -r ".msg")
    echo "$i $msg"
    if [[ $status == "false" ]]; then

        if [[ $msg == "no_file_task" ]]; then
            sleep 1
            exit 1
        fi

        if [[ $msg == "no_file_tmp" ]]; then
            sleep 10
        fi
        
        if [[ $msg == "download_error" ]]; then
            sleep 2
            curl -sS "http://127.0.0.1/cancle?slug=${1}"
            exit 1
        fi

    fi


    if [[ $status == "ok" ]]; then
        sleep 5
    fi

done